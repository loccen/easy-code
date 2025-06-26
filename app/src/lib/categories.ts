import { supabase } from './supabase';
import { Category } from '@/types';

/**
 * 获取所有活跃分类
 */
export async function getActiveCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('获取分类失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 获取所有分类（包括非活跃的，用于管理）
 */
export async function getAllCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select(`
      *,
      parent:categories!parent_id(name)
    `)
    .order('sort_order');

  if (error) {
    console.error('获取所有分类失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 根据slug获取分类
 */
export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // 未找到
    }
    console.error('获取分类失败:', error);
    throw error;
  }

  return data;
}

/**
 * 获取顶级分类
 */
export async function getTopLevelCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .is('parent_id', null)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('获取顶级分类失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 获取指定分类的子分类
 */
export async function getSubCategories(parentId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('parent_id', parentId)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('获取子分类失败:', error);
    throw error;
  }

  return data || [];
}

/**
 * 创建分类
 */
export async function createCategory(categoryData: Omit<Category, 'id' | 'created_at' | 'updated_at'>): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert(categoryData)
    .select()
    .single();

  if (error) {
    console.error('创建分类失败:', error);
    throw error;
  }

  return data;
}

/**
 * 更新分类
 */
export async function updateCategory(id: string, categoryData: Partial<Omit<Category, 'id' | 'created_at' | 'updated_at'>>): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .update(categoryData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('更新分类失败:', error);
    throw error;
  }

  return data;
}

/**
 * 删除分类
 */
export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('删除分类失败:', error);
    throw error;
  }
}

/**
 * 切换分类状态
 */
export async function toggleCategoryStatus(id: string): Promise<Category> {
  // 先获取当前状态
  const { data: currentData, error: fetchError } = await supabase
    .from('categories')
    .select('is_active')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('获取分类状态失败:', fetchError);
    throw fetchError;
  }

  // 切换状态
  const { data, error } = await supabase
    .from('categories')
    .update({ is_active: !currentData.is_active })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('切换分类状态失败:', error);
    throw error;
  }

  return data;
}

/**
 * 生成URL友好的slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u4e00-\u9fff\s-]/g, '') // 保留中文、英文、数字、空格和连字符
    .replace(/\s+/g, '-') // 空格替换为连字符
    .replace(/-+/g, '-') // 多个连字符合并为一个
    .replace(/^-+|-+$/g, ''); // 去除首尾连字符
}

/**
 * 验证分类数据
 */
export function validateCategoryData(data: Partial<Category>): string[] {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push('分类名称不能为空');
  }

  if (!data.slug || data.slug.trim().length === 0) {
    errors.push('URL标识不能为空');
  }

  if (data.slug && !/^[a-z0-9-]+$/.test(data.slug)) {
    errors.push('URL标识只能包含小写字母、数字和连字符');
  }

  if (data.sort_order !== undefined && data.sort_order < 0) {
    errors.push('排序值不能为负数');
  }

  return errors;
}

/**
 * 检查slug是否已存在
 */
export async function isSlugExists(slug: string, excludeId?: string): Promise<boolean> {
  let query = supabase
    .from('categories')
    .select('id')
    .eq('slug', slug);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('检查slug失败:', error);
    throw error;
  }

  return (data?.length || 0) > 0;
}

/**
 * 获取分类树结构
 */
export function buildCategoryTree(categories: Category[]): Category[] {
  const categoryMap = new Map<string, Category & { children?: Category[] }>();
  const rootCategories: (Category & { children?: Category[] })[] = [];

  // 创建映射
  categories.forEach(category => {
    categoryMap.set(category.id, { ...category, children: [] });
  });

  // 构建树结构
  categories.forEach(category => {
    const categoryWithChildren = categoryMap.get(category.id)!;
    
    if (category.parent_id) {
      const parent = categoryMap.get(category.parent_id);
      if (parent) {
        parent.children!.push(categoryWithChildren);
      }
    } else {
      rootCategories.push(categoryWithChildren);
    }
  });

  return rootCategories;
}
