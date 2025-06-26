import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// 客户端Supabase实例
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// 服务端Supabase实例（用于服务端操作）
export const createServerSupabaseClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// 数据库表名常量
export const TABLES = {
  USERS: 'users',
  USER_PROFILES: 'user_profiles',
  USER_AUTH: 'user_auth',
  PROJECTS: 'projects',
  CATEGORIES: 'categories',
  PROJECT_TAGS: 'project_tags',
  PROJECT_FILES: 'project_files',
  PROJECT_IMAGES: 'project_images',
  ORDERS: 'orders',
  CREDITS: 'credits',
  REVIEWS: 'reviews',
  DEPLOYMENTS: 'deployments',
  AUDIT_LOGS: 'audit_logs',
} as const;
