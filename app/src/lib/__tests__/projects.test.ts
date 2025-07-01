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
  createProject,
  updateProject,
  updateProjectStatus,
  getSellerProjects,
  incrementProjectViews,
  incrementProjectDownloads,
  getPopularProjects,
  getLatestProjects
} from '../projects';

describe('Projects API', () => {
  let mockSupabase: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Get fresh mock reference
    mockSupabase = (await import('../supabase')).supabase;
  });

  describe('getPublishedProjects', () => {
    it('should fetch published projects with default options', async () => {
      const mockProjects = [createMockProject(), createMockProject({ id: 'project-2' })];
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockSupabaseResponse(mockProjects, null, 2)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await getPublishedProjects();

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.select).toHaveBeenCalled();
      expect(mockQuery.eq).toHaveBeenCalledWith('status', 'approved');
      expect(result.projects).toEqual(mockProjects);
      expect(result.total).toBe(2);
    });

    it('should apply category filter when provided', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockSupabaseResponse([], null, 0)),
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
        range: vi.fn().mockResolvedValue(createMockSupabaseResponse([], null, 0)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await getPublishedProjects({ search: 'react' });

      expect(mockQuery.or).toHaveBeenCalledWith('title.ilike.%react%,description.ilike.%react%');
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Database error');
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, mockError)),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

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

    it('should throw error when project not found', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(createMockSupabaseResponse(null, { code: 'PGRST116' })),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await expect(getProjectById('non-existent')).rejects.toThrow();
    });
  });

  describe('createProject', () => {
    it('should create project successfully', async () => {
      const projectData = {
        title: 'New Project',
        description: 'Project description',
        price: 100,
        seller_id: 'seller-id',
        category_id: 'category-id',
        tech_stack: ['React', 'TypeScript'],
        features: ['Feature 1'],
        requirements: ['Node.js'],
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
        seller_id: 'seller-id',
        category_id: 'category-id',
        tech_stack: ['React'],
        features: ['Feature 1'],
        requirements: ['Node.js'],
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
});
