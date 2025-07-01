/**
 * 认证功能单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies first
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('../credits', () => ({
  grantRegistrationBonus: vi.fn(),
}));

// Import after mocking
import { signUp, signIn, signOut, getCurrentUser } from '../auth';

describe('Auth API', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockGrantRegistrationBonus: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get fresh mock references
    mockSupabase = (await import('../supabase')).supabase;
    mockGrantRegistrationBonus = (await import('../credits')).grantRegistrationBonus;
  });

  describe('signUp', () => {
    it('should register user successfully', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token' };
      
      // Mock auth signup
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      // Mock database operations
      const mockUsersQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      const mockProfilesQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockUsersQuery) // users table
        .mockReturnValueOnce(mockProfilesQuery); // user_profiles table

      mockGrantRegistrationBonus.mockResolvedValue(undefined);

      const result = await signUp('test@example.com', 'password123', 'testuser');

      expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(mockUsersQuery.insert).toHaveBeenCalledWith({
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        email_verified: false,
      });

      expect(mockProfilesQuery.insert).toHaveBeenCalledWith({
        user_id: 'user-123',
        language: 'zh-CN',
      });

      expect(mockGrantRegistrationBonus).toHaveBeenCalledWith('user-123');

      expect(result).toEqual({
        user: mockUser,
        session: mockSession,
      });
    });

    it('should handle auth signup errors', async () => {
      const mockError = new Error('Email already exists');
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      await expect(signUp('test@example.com', 'password123', 'testuser'))
        .rejects.toThrow('Email already exists');
    });

    it('should handle missing user data', async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      await expect(signUp('test@example.com', 'password123', 'testuser'))
        .rejects.toThrow('注册失败：未返回用户信息');
    });

    it('should handle database insertion errors', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      });

      const mockError = new Error('Database constraint violation');
      const mockUsersQuery = {
        insert: vi.fn().mockResolvedValue({ error: mockError }),
      };

      mockSupabase.from.mockReturnValue(mockUsersQuery);

      await expect(signUp('test@example.com', 'password123', 'testuser'))
        .rejects.toThrow('Database constraint violation');
    });

    it('should continue registration even if bonus grant fails', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      const mockSession = { access_token: 'token' };
      
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const mockUsersQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
      const mockProfilesQuery = {
        insert: vi.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockUsersQuery)
        .mockReturnValueOnce(mockProfilesQuery);

      // Mock bonus grant failure
      mockGrantRegistrationBonus.mockRejectedValue(new Error('Bonus service unavailable'));

      const result = await signUp('test@example.com', 'password123', 'testuser');

      // Should still return successful registration
      expect(result).toEqual({
        user: mockUser,
        session: mockSession,
      });
    });
  });

  describe('signIn', () => {
    it('should sign in user successfully', async () => {
      const mockData = {
        user: { id: 'user-123', email: 'test@example.com' },
        session: { access_token: 'token' },
      };

      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await signIn('test@example.com', 'password123');

      expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockData);
    });

    it('should handle sign in errors', async () => {
      const mockError = new Error('Invalid credentials');
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: mockError,
      });

      await expect(signIn('test@example.com', 'wrongpassword'))
        .rejects.toThrow('Invalid credentials');
    });
  });

  describe('signOut', () => {
    it('should sign out user successfully', async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      await signOut();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
    });

    it('should handle sign out errors', async () => {
      const mockError = new Error('Sign out failed');
      mockSupabase.auth.signOut.mockResolvedValue({ error: mockError });

      await expect(signOut()).rejects.toThrow('Sign out failed');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user with profile successfully', async () => {
      const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
      const mockUserData = [createMockUser({ id: 'user-123' })];
      const mockProfileData = [{ user_id: 'user-123', language: 'zh-CN' }];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      const mockUsersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockUserData, error: null }),
      };

      const mockProfilesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockProfileData, error: null }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockUsersQuery)
        .mockReturnValueOnce(mockProfilesQuery);

      const result = await getCurrentUser();

      expect(result).toEqual({
        ...mockUserData[0],
        profile: mockProfileData[0],
      });
    });

    it('should return null when no auth user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null when user record not found', async () => {
      const mockAuthUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      const mockUsersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabase.from.mockReturnValue(mockUsersQuery);

      const result = await getCurrentUser();

      expect(result).toBeNull();
    });

    it('should handle deleted users', async () => {
      const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
      const mockUserData = [createMockUser({ id: 'user-123', status: 'deleted' })];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      const mockUsersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockUserData, error: null }),
      };

      mockSupabase.from.mockReturnValue(mockUsersQuery);
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const result = await getCurrentUser();

      expect(mockSupabase.auth.signOut).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should handle user data fetch errors', async () => {
      const mockAuthUser = { id: 'user-123', email: 'test@example.com' };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      const mockError = new Error('Database error');
      const mockUsersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      };

      mockSupabase.from.mockReturnValue(mockUsersQuery);

      // getCurrentUser catches errors and returns null
      const result = await getCurrentUser();
      expect(result).toBeNull();
    });

    it('should work without profile data', async () => {
      const mockAuthUser = { id: 'user-123', email: 'test@example.com' };
      const mockUserData = [createMockUser({ id: 'user-123' })];

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockAuthUser },
        error: null,
      });

      const mockUsersQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: mockUserData, error: null }),
      };

      const mockProfilesQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: new Error('Profile not found') }),
      };

      mockSupabase.from
        .mockReturnValueOnce(mockUsersQuery)
        .mockReturnValueOnce(mockProfilesQuery);

      const result = await getCurrentUser();

      expect(result).toEqual({
        ...mockUserData[0],
        profile: undefined,
      });
    });
  });
});
