import { supabase } from './supabase';
import { Project } from '@/types';

/**
 * 获取已发布的项目列表
 */
export async function getPublishedProjects(options?: {
  categoryId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'created_at' | 'price' | 'rating_average' | 'download_count';
  sortOrder?: 'asc' | 'desc';
}): Promise<{ projects: Project[]; total: number }> {
  let query = supabase
    .from('projects')
    .select(`
      *,
      category:categories(name, slug),
      seller:users(username, email)
    `, { count: 'exact' })
    .eq('status', 'approved');

  // 分类筛选
  if (options?.categoryId) {
    query = query.eq('category_id', options.categoryId);
  }

  // 搜索
  if (options?.search) {
    query = query.or(`title.ilike.%${options.search}%,description.ilike.%${options.search}%`);
  }

  // 排序
  const sortBy = options?.sortBy || 'created_at';
  const sortOrder = options?.sortOrder || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // 分页
  if (options?.limit) {
    query = query.limit(options.limit);
  }
  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options?.limit || 10) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('获取项目列表失败:', error);
    throw error;
  }

  return {
    projects: data || [],
    total: count || 0
  };
}

/**
 * 根据ID获取项目详情
 */
export async function getProjectById(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      category:categories(name, slug),
      seller:users(username, email)
    `)
    .eq('id', id)
    .eq('status', 'approved')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // 未找到
    }
    console.error('获取项目详情失败:', error);
    throw error;
  }

  return data;
}

/**
 * 获取卖家的项目列表
 */
export async function getSellerProjects(sellerId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      category:categories(name, slug)
    `)
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('获取卖家项目失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 创建项目
 */
export async function createProject(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single();

  if (error) {
    console.error('创建项目失败:', error);
    throw error;
  }

  return data;
}

/**
 * 更新项目
 */
export async function updateProject(id: string, projectData: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({
      ...projectData,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('更新项目失败:', error);
    throw error;
  }

  return data;
}

/**
 * 删除项目
 */
export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除项目失败:', error);
    throw error;
  }
}

/**
 * 更新项目状态
 */
export async function updateProjectStatus(id: string, status: string): Promise<Project> {
  const updateData: any = { 
    status,
    updated_at: new Date().toISOString()
  };

  // 如果状态是发布，设置发布时间
  if (status === 'approved') {
    updateData.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('更新项目状态失败:', error);
    throw error;
  }

  return data;
}

/**
 * 增加项目浏览量
 */
export async function incrementProjectViews(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_project_views', {
    project_id: id
  });

  if (error) {
    console.error('增加浏览量失败:', error);
    // 不抛出错误，因为这不是关键功能
  }
}

/**
 * 增加项目下载量
 */
export async function incrementProjectDownloads(id: string): Promise<void> {
  const { error } = await supabase.rpc('increment_project_downloads', {
    project_id: id
  });

  if (error) {
    console.error('增加下载量失败:', error);
    // 不抛出错误，因为这不是关键功能
  }
}

/**
 * 获取热门项目
 */
export async function getPopularProjects(limit: number = 10): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      category:categories(name, slug),
      seller:users(username, email)
    `)
    .eq('status', 'approved')
    .order('download_count', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取热门项目失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 获取精选项目
 */
export async function getFeaturedProjects(limit: number = 10): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      category:categories(name, slug),
      seller:users(username, email)
    `)
    .eq('status', 'approved')
    .eq('featured', true)
    .or(`featured_until.is.null,featured_until.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取精选项目失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 获取最新项目
 */
export async function getLatestProjects(limit: number = 10): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      category:categories(name, slug),
      seller:users(username, email)
    `)
    .eq('status', 'approved')
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('获取最新项目失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 搜索项目
 */
export async function searchProjects(query: string, options?: {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  techStack?: string[];
  limit?: number;
  offset?: number;
}): Promise<{ projects: Project[]; total: number }> {
  let supabaseQuery = supabase
    .from('projects')
    .select(`
      *,
      category:categories(name, slug),
      seller:users(username, email)
    `, { count: 'exact' })
    .eq('status', 'approved');

  // 文本搜索
  if (query.trim()) {
    supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,tech_stack.cs.{${query}}`);
  }

  // 分类筛选
  if (options?.categoryId) {
    supabaseQuery = supabaseQuery.eq('category_id', options.categoryId);
  }

  // 价格范围
  if (options?.minPrice !== undefined) {
    supabaseQuery = supabaseQuery.gte('price', options.minPrice);
  }
  if (options?.maxPrice !== undefined) {
    supabaseQuery = supabaseQuery.lte('price', options.maxPrice);
  }

  // 技术栈筛选
  if (options?.techStack && options.techStack.length > 0) {
    supabaseQuery = supabaseQuery.overlaps('tech_stack', options.techStack);
  }

  // 排序
  supabaseQuery = supabaseQuery.order('created_at', { ascending: false });

  // 分页
  if (options?.limit) {
    supabaseQuery = supabaseQuery.limit(options.limit);
  }
  if (options?.offset) {
    supabaseQuery = supabaseQuery.range(options.offset, options.offset + (options?.limit || 10) - 1);
  }

  const { data, error, count } = await supabaseQuery;

  if (error) {
    console.error('搜索项目失败:', error);
    throw error;
  }

  return {
    projects: data || [],
    total: count || 0
  };
}

/**
 * 验证项目数据
 */
export function validateProjectData(data: Partial<Project>): string[] {
  const errors: string[] = [];

  if (!data.title || data.title.trim().length === 0) {
    errors.push('项目标题不能为空');
  }

  if (!data.description || data.description.trim().length === 0) {
    errors.push('项目描述不能为空');
  }

  if (data.price === undefined || data.price < 0) {
    errors.push('价格不能为负数');
  }

  if (data.demo_url && !isValidUrl(data.demo_url)) {
    errors.push('演示地址格式不正确');
  }

  if (data.github_url && !isValidUrl(data.github_url)) {
    errors.push('GitHub地址格式不正确');
  }

  if (data.documentation_url && !isValidUrl(data.documentation_url)) {
    errors.push('文档地址格式不正确');
  }

  return errors;
}

/**
 * 验证URL格式
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
