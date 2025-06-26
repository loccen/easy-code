-- 易码网认证配置脚本
-- 配置Supabase Auth的相关设置

-- 注意：以下配置需要通过Supabase API或Dashboard设置
-- 这个文件仅作为配置参考

/*
通过Supabase API设置认证配置：

1. 禁用邮箱确认（开发环境）：
PATCH /v1/projects/{project_id}/config/auth
{
  "mailer_autoconfirm": true
}

2. 设置重定向URL：
PATCH /v1/projects/{project_id}/config/auth  
{
  "site_url": "http://localhost:3000",
  "additional_redirect_urls": ["http://localhost:3000/auth/callback"]
}

3. 启用邮箱注册：
PATCH /v1/projects/{project_id}/config/auth
{
  "disable_signup": false,
  "enable_signup": true
}

4. 设置JWT过期时间：
PATCH /v1/projects/{project_id}/config/auth
{
  "jwt_exp": 3600
}

5. 配置密码要求：
PATCH /v1/projects/{project_id}/config/auth
{
  "password_min_length": 6
}
*/

-- 创建认证相关的触发器和函数
-- 当用户在auth.users中创建时，自动在我们的users表中创建记录

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, username, email_verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email_confirmed_at IS NOT NULL
  );
  
  INSERT INTO public.user_profiles (user_id, language)
  VALUES (NEW.id, 'zh-CN');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 创建用户更新触发器
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger AS $$
BEGIN
  UPDATE public.users 
  SET 
    email = NEW.email,
    email_verified = NEW.email_confirmed_at IS NOT NULL,
    updated_at = NOW()
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建用户更新触发器
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- 创建用户删除触发器
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建用户删除触发器
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();
