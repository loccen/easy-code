-- 易码网存储配置脚本
-- 创建存储桶和相关策略

-- 创建用户上传存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-uploads',
  'user-uploads',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- 用户上传文件的RLS策略

-- 允许认证用户查看所有公开文件
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'user-uploads');

-- 允许用户上传文件到自己的目录
CREATE POLICY "Users can upload own files" ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'user-uploads' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'avatars'
);

-- 允许用户更新自己的文件
CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'user-uploads' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (regexp_split_to_array((storage.filename(name)), '-'))[1] = auth.uid()::text
);

-- 允许用户删除自己的文件
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE 
USING (
  bucket_id = 'user-uploads' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'avatars'
  AND (regexp_split_to_array((storage.filename(name)), '-'))[1] = auth.uid()::text
);

-- 创建项目文件存储桶（用于项目源码等）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-files',
  'project-files',
  false, -- 私有桶
  104857600, -- 100MB
  NULL -- 允许所有文件类型
) ON CONFLICT (id) DO NOTHING;

-- 项目文件的RLS策略

-- 项目所有者可以管理自己的项目文件
CREATE POLICY "Project owners can manage files" ON storage.objects FOR ALL 
USING (
  bucket_id = 'project-files' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM projects 
    WHERE id::text = (storage.foldername(name))[1]
    AND seller_id = auth.uid()
  )
);

-- 已购买用户可以下载项目文件
CREATE POLICY "Buyers can download purchased files" ON storage.objects FOR SELECT 
USING (
  bucket_id = 'project-files' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM orders o
    JOIN projects p ON o.project_id = p.id
    WHERE p.id::text = (storage.foldername(name))[1]
    AND o.buyer_id = auth.uid()
    AND o.status = 'completed'
  )
);
