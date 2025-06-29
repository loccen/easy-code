// 用户相关类型
export type UserRole = 'buyer' | 'seller' | 'admin';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'banned';

export interface User {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  status: UserStatus;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  user_id: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  bio?: string;
  github_url?: string;
  website_url?: string;
  location?: string;
  timezone?: string;
  language: string;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// 角色升级相关类型
export type UpgradeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface RoleUpgradeRequest {
  id: string;
  user_id: string;
  from_role: UserRole;
  to_role: UserRole;
  status: UpgradeRequestStatus;
  reason: string;
  experience?: string;
  portfolio_url?: string;
  github_url?: string;
  admin_comment?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  // 关联数据
  user?: User;
  reviewer?: User;
}

// 积分系统相关类型
export type CreditTransactionType =
  | 'earn_register'      // 注册奖励
  | 'earn_upload'        // 上传项目奖励
  | 'earn_review'        // 评价奖励
  | 'earn_referral'      // 推荐奖励
  | 'earn_daily'         // 每日签到
  | 'earn_docker'        // Docker化项目双倍奖励
  | 'spend_purchase'     // 购买项目消费
  | 'spend_feature'      // 项目置顶消费
  | 'refund_purchase'    // 购买退款
  | 'admin_adjust';      // 管理员调整

export interface UserCredits {
  id: string;
  user_id: string;
  total_credits: number;
  available_credits: number;
  frozen_credits: number;
  created_at: string;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  transaction_type: CreditTransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  description?: string;
  reference_id?: string;
  reference_type?: string;
  created_by?: string;
  created_at: string;
}

export interface CreditConfig {
  id: string;
  config_key: string;
  config_value: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 积分操作请求类型
export interface AddCreditsRequest {
  user_id: string;
  amount: number;
  transaction_type: CreditTransactionType;
  description?: string;
  reference_id?: string;
  reference_type?: string;
}

export interface SpendCreditsRequest {
  user_id: string;
  amount: number;
  transaction_type: CreditTransactionType;
  description?: string;
  reference_id?: string;
  reference_type?: string;
}

// 项目相关类型
export type ProjectStatus = 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived';

export interface Project {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  short_description?: string;
  category_id?: string;
  price: number;
  currency: string;
  status: ProjectStatus;
  is_dockerized: boolean;
  docker_verified: boolean;
  tech_stack: string[];
  demo_url?: string;
  github_url?: string;
  documentation_url?: string;
  download_count: number;
  view_count: number;
  rating_average: number;
  rating_count: number;
  featured: boolean;
  featured_until?: string;
  file_urls?: string[];
  review_comment?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parent_id?: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// 分页类型
export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
