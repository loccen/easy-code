/**
 * 项目API路由测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as getProjects, POST as createProject } from '@/app/api/projects/route';
import { GET as getProject, PUT as updateProject } from '@/app/api/projects/[id]/route';
import { PUT as updateProjectStatus } from '@/app/api/projects/[id]/status/route';
import { POST as incrementViews } from '@/app/api/projects/[id]/views/route';
import { GET as getPopularProjects } from '@/app/api/projects/popular/route';
import { GET as searchProjects } from '@/app/api/projects/search/route';

// Mock dependencies
vi.mock('@/lib/services/project.service', () => ({
  projectService: {
    getPublishedProjects: vi.fn(),
    createProject: vi.fn(),
    getProjectDetail: vi.fn(),
    updateProject: vi.fn(),
    reviewProject: vi.fn(),
    incrementViews: vi.fn(),
    incrementDownloads: vi.fn(),
    getPopularProjects: vi.fn(),
    getFeaturedProjects: vi.fn(),
    searchProjects: vi.fn(),
    delete: vi.fn(),
    deleteProjectAsAdmin: vi.fn(),
  },
}));

vi.mock('@/lib/api/middleware', () => ({
  withApiHandler: vi.fn((handler) => async (req: NextRequest, context?: unknown) => {
    try {
      return await handler(req, context);
    } catch {
      return { success: false, error: { code: 'INTERNAL_ERROR', message: 'Internal error' } };
    }
  }),
  withAuth: vi.fn((handler) => async (req: NextRequest, context?: unknown) => {
    return await handler(req, context);
  }),
  withValidation: vi.fn(() => (handler: unknown) => async (req: NextRequest, context?: unknown) => {
    return await (handler as (req: NextRequest, context?: unknown) => Promise<unknown>)(req, context);
  }),
}));

const { projectService } = await import('@/lib/services/project.service');

describe('项目API路由测试', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/projects', () => {
    it('应该返回项目列表', async () => {
      const mockProjects = [
        { id: '1', title: 'Test Project 1', status: 'approved' },
        { id: '2', title: 'Test Project 2', status: 'approved' },
      ];

      vi.mocked(projectService.getPublishedProjects).mockResolvedValue({
        success: true,
        data: mockProjects,
      });

      const request = new NextRequest('http://localhost/api/projects');
      const response = await getProjects(request);

      expect(projectService.getPublishedProjects).toHaveBeenCalled();
      expect(response).toEqual({
        success: true,
        data: mockProjects,
      });
    });

    it('应该处理查询参数', async () => {
      vi.mocked(projectService.getPublishedProjects).mockResolvedValue({
        success: true,
        data: [],
      });

      const request = new NextRequest('http://localhost/api/projects?page=2&limit=10&search=react');
      await getProjects(request);

      expect(projectService.getPublishedProjects).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          limit: 10,
          search: 'react',
        })
      );
    });
  });

  describe('POST /api/projects', () => {
    it('应该创建新项目', async () => {
      const mockProject = { id: '1', title: 'New Project', status: 'pending' };
      const projectData = {
        title: 'New Project',
        description: 'A test project description',
        price: 100,
        category_id: 'cat-1',
        tech_stack: ['React', 'TypeScript'],
        features: ['Feature 1'],
        requirements: ['Requirement 1'],
      };

      vi.mocked(projectService.createProject).mockResolvedValue({
        success: true,
        data: mockProject,
      });

      const request = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify(projectData),
      });

      const context = {
        user: { id: 'user-1', role: 'seller' },
        body: projectData,
      };

      const response = await createProject(request, context);

      expect(projectService.createProject).toHaveBeenCalledWith('user-1', projectData);
      expect(response).toEqual({
        success: true,
        data: mockProject,
      });
    });
  });

  describe('GET /api/projects/[id]', () => {
    it('应该返回项目详情', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const mockProject = { id: projectId, title: 'Test Project', status: 'approved' };

      vi.mocked(projectService.getProjectDetail).mockResolvedValue({
        success: true,
        data: mockProject,
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}`);
      const context = { params: { id: projectId } };

      const response = await getProject(request, context);

      expect(projectService.getProjectDetail).toHaveBeenCalledWith(projectId);
      expect(response).toEqual({
        success: true,
        data: mockProject,
      });
    });

    it('应该验证UUID格式', async () => {
      const request = new NextRequest('http://localhost/api/projects/invalid-id');
      const context = { params: { id: 'invalid-id' } };

      const response = await getProject(request, context);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/projects/[id]', () => {
    it('应该更新项目', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const userId = '550e8400-e29b-41d4-a716-446655440001';
      const mockProject = { id: projectId, title: 'Updated Project' };
      const updateData = { title: 'Updated Project' };

      vi.mocked(projectService.updateProject).mockResolvedValue({
        success: true,
        data: mockProject,
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      const context = {
        params: { id: projectId },
        user: { id: userId, role: 'seller' },
        body: updateData,
      };

      const response = await updateProject(request, context);

      expect(projectService.updateProject).toHaveBeenCalledWith(projectId, userId, updateData);
      expect(response).toEqual({
        success: true,
        data: mockProject,
      });
    });
  });

  describe('PUT /api/projects/[id]/status', () => {
    it('应该更新项目状态（管理员）', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';
      const adminId = '550e8400-e29b-41d4-a716-446655440002';
      const mockProject = { id: projectId, status: 'approved' };
      const statusData = { status: 'approved' };

      vi.mocked(projectService.reviewProject).mockResolvedValue({
        success: true,
        data: mockProject,
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/status`, {
        method: 'PUT',
        body: JSON.stringify(statusData),
      });

      const context = {
        params: { id: projectId },
        user: { id: adminId, role: 'admin' },
        body: statusData,
      };

      const response = await updateProjectStatus(request, context);

      expect(projectService.reviewProject).toHaveBeenCalledWith(projectId, 'approved', undefined);
      expect(response).toEqual({
        success: true,
        data: mockProject,
      });
    });
  });

  describe('POST /api/projects/[id]/views', () => {
    it('应该增加项目浏览量', async () => {
      const projectId = '550e8400-e29b-41d4-a716-446655440000';

      vi.mocked(projectService.incrementViews).mockResolvedValue({
        success: true,
        data: undefined,
      });

      const request = new NextRequest(`http://localhost/api/projects/${projectId}/views`, {
        method: 'POST',
      });

      const context = { params: { id: projectId } };

      const response = await incrementViews(request, context);

      expect(projectService.incrementViews).toHaveBeenCalledWith(projectId);
      expect(response.success).toBe(true);
    });
  });

  describe('GET /api/projects/popular', () => {
    it('应该返回热门项目', async () => {
      const mockProjects = [
        { id: '1', title: 'Popular Project 1', download_count: 100 },
        { id: '2', title: 'Popular Project 2', download_count: 80 },
      ];

      vi.mocked(projectService.getPopularProjects).mockResolvedValue({
        success: true,
        data: mockProjects,
      });

      const request = new NextRequest('http://localhost/api/projects/popular');
      const response = await getPopularProjects(request);

      // 默认limit是10，但由于没有查询参数，会传递undefined
      expect(projectService.getPopularProjects).toHaveBeenCalledWith(undefined);
      expect(response).toEqual({
        success: true,
        data: mockProjects,
      });
    });

    it('应该处理limit参数', async () => {
      const mockProjects = [
        { id: '1', title: 'Popular Project 1', download_count: 100 },
      ];

      vi.mocked(projectService.getPopularProjects).mockResolvedValue({
        success: true,
        data: mockProjects,
      });

      const request = new NextRequest('http://localhost/api/projects/popular?limit=5');
      const response = await getPopularProjects(request);

      expect(projectService.getPopularProjects).toHaveBeenCalledWith(5);
      expect(response).toEqual({
        success: true,
        data: mockProjects,
      });
    });
  });

  describe('GET /api/projects/search', () => {
    it('应该搜索项目', async () => {
      const mockProjects = [
        { id: '1', title: 'React Project', tech_stack: ['React'] },
      ];

      vi.mocked(projectService.searchProjects).mockResolvedValue({
        success: true,
        data: mockProjects,
      });

      const request = new NextRequest('http://localhost/api/projects/search?q=react');
      const response = await searchProjects(request);

      expect(projectService.searchProjects).toHaveBeenCalledWith('react', expect.any(Object));
      expect(response).toEqual({
        success: true,
        data: mockProjects,
      });
    });

    it('应该验证搜索关键词', async () => {
      const request = new NextRequest('http://localhost/api/projects/search?q=');
      const response = await searchProjects(request);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('VALIDATION_ERROR');
    });
  });
});
