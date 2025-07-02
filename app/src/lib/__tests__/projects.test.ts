/**
 * 项目管理功能单元测试
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
  getPublishedProjects,
  getProjectById,
  getSellerProjects,
  createProject,
  updateProject,
  deleteProject,
  updateProjectStatus,
  incrementProjectViews,
  getPopularProjects,
  getFeaturedProjects,
  getLatestProjects,
  searchProjects,
  getAllProjectsForAdmin,
  getProjectStatsForAdmin,
  updateProjectStatusAsAdmin,
  deleteProjectAsAdmin,
  incrementProjectDownloads,
  validateProjectData
} from '../projects';

// Type for mocked Supabase instance
type MockSupabase = {
  rpc: ReturnType<typeof vi.fn>;
  from: ReturnType<typeof vi.fn>;
  auth?: {
    getUser: ReturnType<typeof vi.fn>;
  };
};

// Type for Supabase error
type SupabaseError = {
  code?: string;
  message?: string;
};

// Helper function to create mock Supabase response
function createMockSupabaseResponse<T>(data: T, error: Error | SupabaseError | null = null) {
  return { data, error };
}

describe('Projects API', () => {
  let mockSupabase: MockSupabase;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get fresh mock reference
    mockSupabase = (await import('../supabase')).supabase as unknown as MockSupabase;
  });

  describe('getPublishedProjects', () => {
    it('should fetch published projects with default options', async () => {
      const mockProjects = [createMockProject(), createMockProject({ id: 'project-2' })];

      // Create a promise that resolves to the query result
      const queryPromise = Promise.resolve({
        data: mockProjects,
        error: null,
        count: 2
      });

      // Mock the query chain - each method returns the promise
      const mockQuery = {
        select: vi.fn().mockReturnValue(queryPromise),
        eq: vi.fn().mockReturnValue(queryPromise),
        order: vi.fn().mockReturnValue(queryPromise),
        limit: vi.fn().mockReturnValue(queryPromise),
        range: vi.fn().mockReturnValue(queryPromise),
      };

      // Override the chain to return this for chaining, but final result is the promise
      mockQuery.select.mockReturnThis();
      mockQuery.eq.mockReturnThis();
      mockQuery.order.mockReturnThis();
      mockQuery.limit.mockReturnThis();
      mockQuery.range.mockReturnThis();

      // Make the query object itself awaitable
      (mockQuery as unknown as Promise<unknown>).then = queryPromise.then.bind(queryPromise);
      (mockQuery as unknown as Promise<unknown>).catch = queryPromise.catch.bind(queryPromise);

      mockSupabase.from.mockReturnValue(mockQuery);

      // Mock the RPC call for getting seller info
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse({
        username: 'test-seller',
        avatar_url: null
      }));

      const result = await getPublishedProjects();

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.select).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'approved');
      expect(result.projects).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should apply category filter when provided', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockSupabaseResponse([])),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await getPublishedProjects({ categoryId: 'web-dev' });

      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'approved');
      expect(mockQuery.eq).toHaveBeenCalledWith('category_id', 'web-dev');
    });

    it('should apply search filter when provided', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockSupabaseResponse([])),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await getPublishedProjects({ search: 'react' });

      expect(mockQuery.or).toHaveBeenCalledWith('title.ilike.%react%,description.ilike.%react%');
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Database error');

      // Mock supabase.from to throw error directly
      mockSupabase.from.mockImplementation(() => {
        throw mockError;
      });

      await expect(getPublishedProjects()).rejects.toThrow('Database error');
    });
  });

  describe('getProjectById', () => {
    it('should fetch project by id successfully', async () => {
      const mockProject = createMockProject();
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockProject)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getProjectById('test-id');

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'test-id');
      expect(result).toEqual(mockProject);
    });

    it('should return null when project not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, { code: 'PGRST116' })),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getProjectById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('createProject', () => {
    it('should create project successfully', async () => {
      const projectData = {
        title: 'New Project',
        description: 'Project description',
        price: 100,
        currency: 'CREDITS',
        seller_id: 'seller-id',
        category_id: 'category-id',
        tech_stack: ['React', 'TypeScript'],
        is_dockerized: false,
        docker_verified: false,
        download_count: 0,
        view_count: 0,
        rating_average: 0,
        rating_count: 0,
        featured: false,
        status: 'draft' as const,
      };

      const mockCreatedProject = createMockProject(projectData);
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockCreatedProject)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await createProject(projectData);

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.insert).toHaveBeenCalledWith(projectData);
      expect(result).toEqual(mockCreatedProject);
    });

    it('should handle creation errors', async () => {
      const projectData = {
        title: 'New Project',
        description: 'Project description',
        price: 100,
        currency: 'CREDITS',
        seller_id: 'seller-id',
        category_id: 'category-id',
        tech_stack: ['React'],
        is_dockerized: false,
        docker_verified: false,
        download_count: 0,
        view_count: 0,
        rating_average: 0,
        rating_count: 0,
        featured: false,
        status: 'draft' as const,
      };

      const mockError = new Error('Validation error');
      const mockQuery = {
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(createProject(projectData)).rejects.toThrow('Validation error');
    });
  });

  describe('updateProjectStatus', () => {
    it('should update project status to approved', async () => {
      const mockUpdatedProject = createMockProject({ status: 'approved' });
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockUpdatedProject)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await updateProjectStatus('test-id', 'approved');

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          published_at: expect.any(String),
        })
      );
      expect(result).toEqual(mockUpdatedProject);
    });

    it('should update project status without published_at for non-approved status', async () => {
      const mockUpdatedProject = createMockProject({ status: 'rejected' });
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockUpdatedProject)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await updateProjectStatus('test-id', 'rejected');

      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'rejected',
        })
      );
      expect(mockQuery.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          published_at: expect.any(String),
        })
      );
    });
  });

  describe('incrementProjectViews', () => {
    it('should call increment_project_views RPC', async () => {
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(null));

      await incrementProjectViews('test-id');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_project_views', {
        project_id: 'test-id',
      });
    });

    it('should not throw error on RPC failure', async () => {
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(null, new Error('RPC error')));

      // Should not throw
      await expect(incrementProjectViews('test-id')).resolves.toBeUndefined();
    });
  });

  describe('getPopularProjects', () => {
    it('should fetch popular projects ordered by download count', async () => {
      const mockProjects = [createMockProject({ download_count: 100 })];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockProjects)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getPopularProjects(5);

      expect(mockQuery.order).toHaveBeenCalledWith('download_count', { ascending: false });
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockProjects);
    });
  });

  describe('getSellerProjects', () => {
    it('should fetch seller projects successfully', async () => {
      const mockProjects = [
        createMockProject(),
        createMockProject({ id: 'project-456', title: 'Another Project' }),
      ];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockProjects)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getSellerProjects('seller-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.eq).toHaveBeenCalledWith('seller_id', 'seller-123');
      expect(result).toEqual(mockProjects);
    });

    it('should handle database errors', async () => {
      const mockError = new Error('Database error');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(getSellerProjects('seller-123')).rejects.toThrow('Database error');
    });
  });

  describe('updateProject', () => {
    it('should update project successfully', async () => {
      const updateData = {
        title: 'Updated Project',
        description: 'Updated description',
      };

      const mockUpdatedProject = createMockProject({
        ...updateData,
        updated_at: new Date().toISOString(),
      });

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockUpdatedProject)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await updateProject('project-123', updateData);

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.update).toHaveBeenCalledWith({
        ...updateData,
        updated_at: expect.any(String),
      });
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'project-123');
      expect(result).toEqual(mockUpdatedProject);
    });

    it('should handle update errors', async () => {
      const mockError = new Error('Update failed');
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(updateProject('project-123', { title: 'New Title' })).rejects.toThrow('Update failed');
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(createMockSupabaseResponse(null)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await deleteProject('project-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'project-123');
    });

    it('should handle deletion errors', async () => {
      const mockError = new Error('Deletion failed');
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(deleteProject('project-123')).rejects.toThrow('Deletion failed');
    });
  });

  describe('getAllProjectsForAdmin', () => {
    it('should fetch all projects for admin with filters', async () => {
      const mockProjects = [createMockProject()];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: mockProjects,
          error: null,
          count: 1,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getAllProjectsForAdmin({
        status: 'approved',
        search: 'test',
        limit: 10,
        offset: 0,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(result).toEqual({ projects: mockProjects, total: 1 });
    });

    it('should handle admin query errors', async () => {
      const mockError = new Error('Admin query failed');

      // 创建一个会在await时抛出错误的查询链Mock
      const mockQueryChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        // 模拟最终的await调用返回错误
        then: vi.fn((resolve) => {
          resolve({ data: null, error: mockError, count: null });
          return Promise.resolve({ data: null, error: mockError, count: null });
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryChain);
      await expect(getAllProjectsForAdmin()).rejects.toThrow('Admin query failed');
    });
  });

  describe('getProjectStatsForAdmin', () => {
    it('should fetch project statistics for admin', async () => {
      const mockProjects = [
        { status: 'approved' },
        { status: 'approved' },
        { status: 'pending_review' },
        { status: 'draft' },
      ];

      const mockQuery = {
        select: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockProjects)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getProjectStatsForAdmin();

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(result.total).toBe(4);
      expect(result.approved).toBe(2);
      expect(result.pending_review).toBe(1);
      expect(result.draft).toBe(1);
      expect(result.rejected).toBe(0);
    });

    it('should handle stats query errors', async () => {
      const mockError = new Error('Stats query failed');
      const mockQuery = {
        select: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(getProjectStatsForAdmin()).rejects.toThrow('Stats query failed');
    });
  });

  describe('updateProjectStatusAsAdmin', () => {
    it('should update project status as admin with review comment', async () => {
      const mockUpdatedProject = createMockProject({
        status: 'approved',
        review_comment: 'Looks good!',
      });

      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockUpdatedProject)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await updateProjectStatusAsAdmin('project-123', 'approved', 'Looks good!');

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'approved',
          review_comment: 'Looks good!',
          updated_at: expect.any(String),
          published_at: expect.any(String),
        })
      );
      expect(result).toEqual(mockUpdatedProject);
    });

    it('should handle admin status update errors', async () => {
      const mockError = new Error('Admin update failed');
      const mockQuery = {
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(updateProjectStatusAsAdmin('project-123', 'approved')).rejects.toThrow('Admin update failed');
    });
  });

  describe('deleteProjectAsAdmin', () => {
    it('should delete project as admin successfully', async () => {
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(createMockSupabaseResponse(null)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await deleteProjectAsAdmin('project-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.delete).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'project-123');
    });

    it('should handle admin deletion errors', async () => {
      const mockError = new Error('Admin deletion failed');
      const mockQuery = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(deleteProjectAsAdmin('project-123')).rejects.toThrow('Admin deletion failed');
    });
  });

  describe('incrementProjectDownloads', () => {
    it('should increment project downloads successfully', async () => {
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(null));

      await incrementProjectDownloads('project-123');

      expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_project_downloads', {
        project_id: 'project-123',
      });
    });

    it('should handle download increment errors gracefully', async () => {
      const mockError = new Error('Download increment failed');
      mockSupabase.rpc.mockResolvedValue(createMockSupabaseResponse(null, mockError));

      // Should not throw error, just log it
      await expect(incrementProjectDownloads('project-123')).resolves.not.toThrow();
    });
  });

  describe('getFeaturedProjects', () => {
    it('should fetch featured projects successfully', async () => {
      const mockProjects = [createMockProject({ is_featured: true })];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockProjects)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getFeaturedProjects(5);

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'approved');
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockProjects);
    });

    it('should handle featured projects query errors', async () => {
      const mockError = new Error('Featured query failed');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(getFeaturedProjects()).rejects.toThrow('Featured query failed');
    });
  });

  describe('getLatestProjects', () => {
    it('should fetch latest projects successfully', async () => {
      const mockProjects = [createMockProject()];

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockProjects)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getLatestProjects(5);

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'approved');
      expect(mockQuery.order).toHaveBeenCalledWith('published_at', { ascending: false });
      expect(mockQuery.limit).toHaveBeenCalledWith(5);
      expect(result).toEqual(mockProjects);
    });

    it('should handle latest projects query errors', async () => {
      const mockError = new Error('Latest query failed');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(getLatestProjects()).rejects.toThrow('Latest query failed');
    });
  });

  describe('searchProjects', () => {
    it('should search projects with query and filters', async () => {
      const mockProjects = [createMockProject()];

      // 创建一个完整的查询链Mock，最终在await时返回结果
      const mockQueryChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        overlaps: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        // 模拟最终的await调用
        then: vi.fn((resolve) => {
          resolve({ data: mockProjects, error: null, count: mockProjects.length });
          return Promise.resolve({ data: mockProjects, error: null, count: mockProjects.length });
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryChain);

      const result = await searchProjects('test', { limit: 10 });
      expect(result).toEqual({ projects: mockProjects, total: mockProjects.length });
    });

    it('should handle search errors', async () => {
      const mockError = new Error('Search failed');

      // 创建一个会抛出错误的查询链Mock
      const mockQueryChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        overlaps: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        // 模拟最终的await调用返回错误
        then: vi.fn((resolve) => {
          resolve({ data: null, error: mockError, count: null });
          return Promise.resolve({ data: null, error: mockError, count: null });
        }),
      };

      mockSupabase.from.mockReturnValue(mockQueryChain);
      await expect(searchProjects('test')).rejects.toThrow('Search failed');
    });
  });

  describe('validateProjectData', () => {
    it('should validate project data correctly', () => {
      const validData = {
        title: 'Valid Project',
        description: 'Valid description',
        price: 100,
        demo_url: 'https://example.com',
        github_url: 'https://github.com/user/repo',
      };

      const errors = validateProjectData(validData);
      expect(errors).toEqual([]);
    });

    it('should return errors for invalid data', () => {
      const invalidData = {
        title: '',
        description: '',
        price: -10,
      };

      const errors = validateProjectData(invalidData);
      expect(errors).toContain('项目标题不能为空');
      expect(errors).toContain('项目描述不能为空');
      expect(errors).toContain('价格不能为负数');
    });

    it('should validate URL formats', () => {
      const dataWithInvalidUrls = {
        title: 'Test',
        description: 'Test',
        price: 100,
        demo_url: 'invalid-url',
        github_url: 'not-a-url',
        documentation_url: 'also-invalid',
      };

      const errors = validateProjectData(dataWithInvalidUrls);
      expect(errors).toContain('演示地址格式不正确');
      expect(errors).toContain('GitHub地址格式不正确');
      expect(errors).toContain('文档地址格式不正确');
    });

    it('should handle missing title and description', () => {
      const dataWithMissingFields = {
        price: 100,
      };

      const errors = validateProjectData(dataWithMissingFields);
      expect(errors).toContain('项目标题不能为空');
      expect(errors).toContain('项目描述不能为空');
    });

    it('should handle whitespace-only title and description', () => {
      const dataWithWhitespace = {
        title: '   ',
        description: '   ',
        price: 100,
      };

      const errors = validateProjectData(dataWithWhitespace);
      expect(errors).toContain('项目标题不能为空');
      expect(errors).toContain('项目描述不能为空');
    });
  });
});
